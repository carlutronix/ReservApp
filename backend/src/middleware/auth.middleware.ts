import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('DEBUG AUTH - No token provided');
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      console.log('DEBUG AUTH - Token verification failed:', err.message);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

export const authorizeRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log('DEBUG AUTH - No user in request for role check');
      return res.sendStatus(401);
    }
    if (!roles.includes(req.user.role)) {
      console.log(`DEBUG AUTH - Role mismatch. User role: ${req.user.role}, Required: ${roles.join(',')}`);
      return res.sendStatus(403);
    }
    next();
  };
};
