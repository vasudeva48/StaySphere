const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Rent = require('../models/Rent');
const Agreement = require('../models/Agreement');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Visitor = require('../models/Visitor');
const Attendance = require('../models/Attendance');

/**
 * Syncs a tenant's room and bed assignment across all collections.
 * Handles freeing the old room/bed slot and occupying the new room/bed slot,
 * and updating denormalized fields and references in Rent, Visitor, Attendance,
 * Agreement, and MaintenanceRequest.
 */
const syncTenantRoom = async (tenant, oldRoomNumber, oldBedNumber) => {
  const tenantId = tenant._id;
  const newRoomNumber = tenant.roomNumber;
  const newBedNumber = tenant.bedNumber;
  const isActive = tenant.status === 'Active';

  const hasOld = !!(oldRoomNumber && oldBedNumber);
  const hasNew = !!(newRoomNumber && newBedNumber && isActive);

  if (hasOld && hasNew && oldRoomNumber.trim().toLowerCase() === newRoomNumber.trim().toLowerCase()) {
    // Same room, possibly different bed
    const room = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${newRoomNumber.trim()}$`, 'i') } });
    if (!room) throw new Error(`Room ${newRoomNumber} not found`);

    if (oldBedNumber !== newBedNumber) {
      // Validate new bed first
      const newBed = room.beds.find(b => b.bedLabel === newBedNumber);
      if (!newBed) throw new Error(`Bed ${newBedNumber} not found in Room ${newRoomNumber}`);
      if (newBed.isOccupied && newBed.tenantId?.toString() !== tenantId.toString()) {
        throw new Error(`Bed ${newBedNumber} in Room ${newRoomNumber} is already occupied`);
      }

      // Free old bed
      const oldBed = room.beds.find(b => b.bedLabel === oldBedNumber);
      if (oldBed && oldBed.tenantId?.toString() === tenantId.toString()) {
        oldBed.tenantId = null;
        oldBed.isOccupied = false;
      }

      // Occupy new bed
      newBed.tenantId = tenantId;
      newBed.isOccupied = true;

      room.occupiedBeds = room.beds.filter(b => b.isOccupied).length;
      room.availableBeds = room.totalBeds - room.occupiedBeds;
      await room.save();
    }
  } else {
    // Different rooms
    if (hasOld) {
      const oldRoom = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${oldRoomNumber.trim()}$`, 'i') } });
      if (oldRoom) {
        const oldBed = oldRoom.beds.find(b => b.bedLabel === oldBedNumber);
        if (oldBed && oldBed.tenantId?.toString() === tenantId.toString()) {
          oldBed.tenantId = null;
          oldBed.isOccupied = false;
          oldRoom.occupiedBeds = oldRoom.beds.filter(b => b.isOccupied).length;
          oldRoom.availableBeds = oldRoom.totalBeds - oldRoom.occupiedBeds;
          await oldRoom.save();
        }
      }
    }

    if (hasNew) {
      const newRoom = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${newRoomNumber.trim()}$`, 'i') } });
      if (!newRoom) throw new Error(`Room ${newRoomNumber} not found`);

      const newBed = newRoom.beds.find(b => b.bedLabel === newBedNumber);
      if (!newBed) throw new Error(`Bed ${newBedNumber} not found in Room ${newRoomNumber}`);
      if (newBed.isOccupied && newBed.tenantId?.toString() !== tenantId.toString()) {
        throw new Error(`Bed ${newBedNumber} in Room ${newRoomNumber} is already occupied`);
      }

      newBed.tenantId = tenantId;
      newBed.isOccupied = true;
      newRoom.occupiedBeds = newRoom.beds.filter(b => b.isOccupied).length;
      newRoom.availableBeds = newRoom.totalBeds - newRoom.occupiedBeds;
      await newRoom.save();
    }
  }

  // Update denormalized attributes in Rent, Visitor, Attendance
  const roomToSet = (newRoomNumber && isActive) ? newRoomNumber : '';
  const bedToSet = (newBedNumber && isActive) ? newBedNumber : '';

  await Rent.updateMany({ tenant: tenantId }, { $set: { roomNumber: roomToSet } });
  await Visitor.updateMany({ tenant: tenantId }, { $set: { roomNumber: roomToSet } });
  await Attendance.updateMany({ tenant: tenantId }, { $set: { roomNumber: roomToSet, bedNumber: bedToSet } });

  // Update Agreements and Maintenance if new room is set
  if (hasNew) {
    const newRoom = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${newRoomNumber.trim()}$`, 'i') } });
    if (newRoom) {
      await Agreement.updateMany({ tenant: tenantId }, { $set: { room: newRoom._id } });
      await MaintenanceRequest.updateMany({ tenant: tenantId }, { $set: { room: newRoom._id } });
    }
  }
};

/**
 * Propagates a Room's changed roomNumber string to all referencing collections
 */
const handleRoomNumberChange = async (oldRoomNumber, newRoomNumber) => {
  if (!oldRoomNumber || !newRoomNumber || oldRoomNumber === newRoomNumber) return;

  const oldClean = oldRoomNumber.trim();
  const newClean = newRoomNumber.trim();

  // Update Tenant roomNumber
  await Tenant.updateMany(
    { roomNumber: { $regex: new RegExp(`^${oldClean}$`, 'i') } },
    { $set: { roomNumber: newClean } }
  );

  // Update Rent roomNumber
  await Rent.updateMany(
    { roomNumber: { $regex: new RegExp(`^${oldClean}$`, 'i') } },
    { $set: { roomNumber: newClean } }
  );

  // Update Visitor roomNumber
  await Visitor.updateMany(
    { roomNumber: { $regex: new RegExp(`^${oldClean}$`, 'i') } },
    { $set: { roomNumber: newClean } }
  );

  // Update Attendance roomNumber
  await Attendance.updateMany(
    { roomNumber: { $regex: new RegExp(`^${oldClean}$`, 'i') } },
    { $set: { roomNumber: newClean } }
  );
};

/**
 * Frees up the room bed when a Tenant is deleted
 */
const unassignTenantOnDelete = async (tenant) => {
  if (tenant && tenant.roomNumber && tenant.bedNumber) {
    const room = await Room.findOne({ roomNumber: { $regex: new RegExp(`^${tenant.roomNumber.trim()}$`, 'i') } });
    if (room) {
      const bed = room.beds.find(b => b.bedLabel === tenant.bedNumber);
      if (bed && bed.tenantId?.toString() === tenant._id.toString()) {
        bed.tenantId = null;
        bed.isOccupied = false;
        room.occupiedBeds = room.beds.filter(b => b.isOccupied).length;
        room.availableBeds = room.totalBeds - room.occupiedBeds;
        await room.save();
      }
    }
  }
};

module.exports = {
  syncTenantRoom,
  handleRoomNumberChange,
  unassignTenantOnDelete,
};
