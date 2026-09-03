import { Router, Response } from 'express';
import { Address } from '../models/Address';
import { authenticate, AuthenticatedRequest, requireBuyer } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireBuyer);

// GET /addresses
router.get('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const items = await Address.find({ userId: req.user!.id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});

// POST /addresses
router.post('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { label, fullName, phone, addressLine, city, postalCode, isDefault } = req.body;
    if (!label || !fullName || !phone || !addressLine || !city) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (isDefault) {
      await Address.updateMany({ userId: req.user!.id }, { $set: { isDefault: false } });
    }
    const address = await Address.create({
      userId: req.user!.id,
      label, fullName, phone, addressLine, city, postalCode, isDefault: !!isDefault,
    });
    res.status(201).json({ address });
  } catch (e) { next(e); }
});

// PATCH /addresses/:id
router.patch('/:id', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { label, fullName, phone, addressLine, city, postalCode, isDefault } = req.body;
    const address = await Address.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!address) return res.status(404).json({ error: 'Address not found' });
    if (isDefault) {
      await Address.updateMany({ userId: req.user!.id, _id: { $ne: address._id } }, { $set: { isDefault: false } });
    }
    Object.assign(address, {
      label: label ?? address.label,
      fullName: fullName ?? address.fullName,
      phone: phone ?? address.phone,
      addressLine: addressLine ?? address.addressLine,
      city: city ?? address.city,
      postalCode: postalCode ?? address.postalCode,
      isDefault: isDefault ?? address.isDefault,
    });
    await address.save();
    res.json({ address });
  } catch (e) { next(e); }
});

// DELETE /addresses/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await Address.deleteOne({ _id: req.params.id, userId: req.user!.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
