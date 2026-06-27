import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as userService from '../../services/userService';
import * as cuisineService from '../../services/cuisineService';
import * as cookService from '../../services/cookService';
import * as menuService from '../../services/menuService';
import { generateToken } from '../../auth';
import { uploadToFirebase } from '../../services/firebaseStorage';

const LIVE_STATUSES = ['Verified', 'ACTIVE', 'Active', 'Kitchen_Approved'];

/** Distance between two lat/lng points in km (haversine). */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Customer home feed.
 * Query: lat, lng (optional, sorts kitchens by distance) · cuisineId (optional filter).
 * Returns: cuisine categories, nearby kitchens, and today's available dishes.
 */
export const getHome = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : NaN;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng query params are required',
      });
    }
    const cuisineId = req.query.cuisineId as string | undefined;

    // Greeting name for the logged-in customer (id from token)
    const userId = (req as any).user?.id;
    const me = userId ? await userService.findUserById(userId) : null;
    const userName = me?.name ?? null;

    // Resolve cuisine name for filtering (category chips send a cuisine id)
    let cuisineName: string | undefined;
    if (cuisineId) {
      const c = await cuisineService.findCuisineById(cuisineId);
      cuisineName = c?.name;
    }

    // Live kitchens only
    let cooks = (await cookService.listAllCooks()).filter((c: any) =>
      LIVE_STATUSES.includes(c.status),
    );
    // Filter by cuisine (Cook.cuisines is a stored string of cuisine names)
    if (cuisineName) {
      const needle = cuisineName.toLowerCase();
      cooks = cooks.filter((c: any) =>
        (c.cuisines || '').toLowerCase().includes(needle),
      );
    }

    const cookCards = cooks.map((c: any) => {
      let dist: number | null = null;
      if (lat != null && lng != null && c.lat != null && c.lng != null) {
        dist = Math.round(distanceKm(lat, lng, c.lat, c.lng) * 10) / 10;
      }
      return {
        id: c.id,
        name: c.kitchenName || c.name,
        ownerName: c.name,
        bannerUrl: c.bannerUrl,
        selfieUrl: c.selfieUrl,
        tier: c.tier,
        fssai: c.hasExistingFssai ? 'FSSAI Verified' : 'FSSAI Basic',
        cuisines: c.cuisines,
        isVegOnly: c.isVegOnly,
        about: c.about,
        city: c.city,
        lat: c.lat,
        lng: c.lng,
        rating: null, // ratings not tracked yet
        distanceKm: dist,
        etaMins: dist != null ? Math.max(15, Math.round(dist * 8) + 20) : null,
        isWishlisted: false, // wishlist not implemented yet
      };
    });

    // Sort nearest-first when we have a location
    if (lat != null && lng != null) {
      cookCards.sort(
        (a: any, b: any) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9),
      );
    }

    // Today's menu — available dishes from the (filtered) live kitchens
    const cookMap = new Map(cooks.map((c: any) => [c.id, c]));
    const dishesRaw = await menuService.listAvailableMenus();
    const dishCards = dishesRaw
      .filter((d) => cookMap.has(d.cookId))
      .map((d) => {
        const cook: any = cookMap.get(d.cookId);
        return {
          id: d.id,
          name: d.name,
          price: d.price,
          imageUrl: d.imageUrl,
          diet: d.diet,
          spice: d.spice,
          eggless: d.eggless,
          cookId: d.cookId,
          cookName: cook?.kitchenName || cook?.name,
          isAvailable: d.isAvailable,
        };
      });

    // Cuisine categories for the chips
    const cuisines = await cuisineService.listCuisines(undefined, true);

    return res.json({
      success: true,
      data: {
        userName,
        cuisines,
        cooks: cookCards,
        dishes: dishCards,
      },
    });
  } catch (error) {
    next(error);
  }
};

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).any();

/** GET the authenticated customer's own profile (id from token) */
export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = (req as any).user?.id;
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await userService.findUserById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { id: uid, name, email, phone, dob, profilePicUrl } = user;
    return res.json({ success: true, data: { id: uid, name, email, phone, dob, profilePicUrl } });
  } catch (error) {
    next(error);
  }
};

/** Update the authenticated customer's own profile (id from token) */
export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = (req as any).user?.id;
    if (!id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { name, email, dob, profilePicUrl, fcmToken } = req.body;
    const saved = await userService.updateUser(id, { name, email, dob, profilePicUrl, fcmToken });
    return res.json({ success: true, message: 'Profile updated successfully', data: saved });
  } catch (error) {
    next(error);
  }
};

/** Upload a profile image → Firebase Storage, returns the hosted URL */
export const uploadProfileImage = (req: Request, res: Response, next: NextFunction) => {
  multerUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: 'File upload failed.' });
    }
    const files = req.files as Express.Multer.File[] | undefined;
    const file = files && files.length > 0 ? files[0] : undefined;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file received.' });
    }
    try {
      const fileUrl = await uploadToFirebase(
        file.buffer,
        file.originalname || 'avatar.jpg',
        file.mimetype || 'image/jpeg',
        'user-uploads',
      );
      return res.json({ success: true, fileName: file.originalname, fileUrl });
    } catch (uploadErr: any) {
      return res.status(500).json({ success: false, message: uploadErr.message || 'Upload failed' });
    }
  });
};

/** Request OTP for a customer (dummy code 1234) */
export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mobileNumber, phone } = req.body;
    const phoneNum = mobileNumber || phone;
    if (!phoneNum) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    console.log(`[OTP] Sent verification OTP code 1234 to customer: ${phoneNum}`);
    return res.json({
      success: true,
      message: 'OTP sent successfully (Code: 1234)',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify customer OTP. On first verification the customer account is
 * created from the supplied name + email. Returning customers just log in.
 * This User record is independent of any Cook (kitchen) record on the same phone.
 */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mobileNumber, phone, otp, code, fcmToken, name, email } = req.body;
    const phoneNum = mobileNumber || phone;
    const otpCode = otp || code;

    if (!phoneNum || !otpCode) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP code are required' });
    }
    if (otpCode !== '1234') {
      return res.status(401).json({ success: false, message: 'Invalid OTP code' });
    }

    let user = await userService.findUserByPhone(phoneNum);
    const isRegistered = !!user;

    if (!user) {
      // New customer → require a name to create the account
      if (!name || !name.toString().trim()) {
        return res.status(400).json({ success: false, message: 'Name is required to create your account' });
      }
      user = await userService.createUser({
        name: name.toString(),
        phone: phoneNum,
        email: email?.toString(),
        fcmToken: fcmToken,
      });
    } else if (fcmToken) {
      user = await userService.updateFcmToken(user.id, fcmToken);
    }

    const token = generateToken(user.id, 'user');
    return res.json({
      success: true,
      message: isRegistered ? 'Welcome back!' : 'Account created successfully',
      data: {
        token,
        isRegistered,
        status: user.status,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Shared card mappers (kitchen browse) ─────────────────────────────────────
function buildCookCard(c: any, lat: number | null, lng: number | null) {
  let dist: number | null = null;
  if (lat != null && lng != null && c.lat != null && c.lng != null) {
    dist = Math.round(distanceKm(lat, lng, c.lat, c.lng) * 10) / 10;
  }
  return {
    id: c.id,
    name: c.kitchenName || c.name,
    ownerName: c.name,
    bannerUrl: c.bannerUrl,
    selfieUrl: c.selfieUrl,
    tier: c.tier,
    fssai: c.hasExistingFssai ? 'FSSAI Verified' : 'FSSAI Basic',
    cuisines: c.cuisines,
    isVegOnly: c.isVegOnly,
    about: c.about,
    city: c.city,
    streetAddress: c.streetAddress,
    landmark: c.landmark,
    state: c.state,
    pincode: c.pincode,
    lat: c.lat,
    lng: c.lng,
    rating: null,
    distanceKm: dist,
    etaMins: dist != null ? Math.max(15, Math.round(dist * 8) + 20) : null,
    isWishlisted: false,
  };
}

function buildDishCard(d: any, cook: any) {
  return {
    id: d.id,
    name: d.name,
    price: d.price,
    imageUrl: d.imageUrl,
    diet: d.diet,
    spice: d.spice,
    eggless: d.eggless,
    portion: d.portion,
    ingredients: d.ingredients,
    description: d.description,
    cookId: d.cookId,
    cookName: cook?.kitchenName || cook?.name,
    isAvailable: d.isAvailable,
  };
}

const parseLatLng = (req: Request) => ({
  lat: req.query.lat ? parseFloat(req.query.lat as string) : null,
  lng: req.query.lng ? parseFloat(req.query.lng as string) : null,
});

/** GET /api/user/kitchens — list live kitchens (lat/lng + optional cuisineId) */
export const listKitchens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng } = parseLatLng(req);
    const cuisineId = req.query.cuisineId as string | undefined;
    let cuisineName: string | undefined;
    if (cuisineId) cuisineName = (await cuisineService.findCuisineById(cuisineId))?.name;

    let cooks = (await cookService.listAllCooks()).filter((c: any) =>
      LIVE_STATUSES.includes(c.status),
    );
    if (cuisineName) {
      const needle = cuisineName.toLowerCase();
      cooks = cooks.filter((c: any) => (c.cuisines || '').toLowerCase().includes(needle));
    }
    const cards = cooks.map((c: any) => buildCookCard(c, lat, lng));
    if (lat != null && lng != null) {
      cards.sort((a: any, b: any) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
    }
    return res.json({ success: true, data: cards });
  } catch (error) {
    next(error);
  }
};

/** GET /api/user/kitchens/:id — single kitchen details */
export const getKitchenById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng } = parseLatLng(req);
    const c = await cookService.findCookById(req.params.id as string);
    if (!c || !LIVE_STATUSES.includes(c.status)) {
      return res.status(404).json({ success: false, message: 'Kitchen not found' });
    }
    return res.json({ success: true, data: buildCookCard(c, lat, lng) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/user/kitchens/:id/menu — a kitchen's available dishes */
export const getKitchenMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = await cookService.findCookById(req.params.id as string);
    if (!c) return res.status(404).json({ success: false, message: 'Kitchen not found' });
    const dishes = (await menuService.listMenusByCook(req.params.id as string)).filter(
      (d) => d.isAvailable,
    );
    return res.json({ success: true, data: dishes.map((d) => buildDishCard(d, c)) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/user/dishes — all available dishes (optional cuisineId) */
export const listDishes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cuisineId = req.query.cuisineId as string | undefined;
    let cuisineName: string | undefined;
    if (cuisineId) cuisineName = (await cuisineService.findCuisineById(cuisineId))?.name;

    let cooks = (await cookService.listAllCooks()).filter((c: any) =>
      LIVE_STATUSES.includes(c.status),
    );
    if (cuisineName) {
      const needle = cuisineName.toLowerCase();
      cooks = cooks.filter((c: any) => (c.cuisines || '').toLowerCase().includes(needle));
    }
    const cookMap = new Map(cooks.map((c: any) => [c.id, c]));
    const dishes = (await menuService.listAvailableMenus()).filter((d) => cookMap.has(d.cookId));
    return res.json({
      success: true,
      data: dishes.map((d) => buildDishCard(d, cookMap.get(d.cookId))),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/user/dishes/:id — dish details + recommended products */
export const getDishById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const d = await menuService.findMenuById(req.params.id as string);
    if (!d) return res.status(404).json({ success: false, message: 'Dish not found' });

    const allCooks = await cookService.listAllCooks();
    const cookMap = new Map(allCooks.map((c: any) => [c.id, c]));
    const cook = cookMap.get(d.cookId);

    // Recommended: other available dishes from the same kitchen first,
    // then top up with other kitchens' dishes. Excludes the current dish.
    const sameCook = (await menuService.listMenusByCook(d.cookId)).filter(
      (x) => x.isAvailable && x.id !== d.id,
    );
    let recs = [...sameCook];
    if (recs.length < 4) {
      const others = (await menuService.listAvailableMenus()).filter(
        (x) => x.id !== d.id && x.cookId !== d.cookId && cookMap.has(x.cookId),
      );
      recs = [...recs, ...others];
    }
    const recommended = recs
      .slice(0, 6)
      .map((r) => buildDishCard(r, cookMap.get(r.cookId)));

    return res.json({
      success: true,
      data: { ...buildDishCard(d, cook), recommended },
    });
  } catch (error) {
    next(error);
  }
};

/** Get active cuisines list (public - for user/customer app) */
export const getCuisines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cuisines = await cuisineService.listCuisines(undefined, true);
    return res.json({ success: true, data: cuisines });
  } catch (error) {
    next(error);
  }
};
