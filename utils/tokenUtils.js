const jwt = require('jsonwebtoken');

const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'dzs_erp_super_secret_jwt_key_2026_production_grade_random_hash',
    {
      expiresIn: '30d',
    }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  res.cookie('token', token, cookieOptions);
  return token;
};

module.exports = { generateTokenAndSetCookie };
