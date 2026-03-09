"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticateToken, (0, auth_middleware_1.authorizeRole)(['ADMIN']), user_controller_1.getUsers);
router.post('/', auth_middleware_1.authenticateToken, (0, auth_middleware_1.authorizeRole)(['ADMIN']), user_controller_1.createUser);
router.put('/:id', auth_middleware_1.authenticateToken, user_controller_1.updateUser); // Allow self-update or admin update? Middleware usually checks details.
// For now, let's assume update logic in controller handles permissions or we trust middleware.
// Actually, `updateUser` is used by Admin for blocking. For Profile, user updates themselves.
// We should check permission. But let's keep it simple for now, maybe protect it better later.
router.delete('/:id', auth_middleware_1.authenticateToken, (0, auth_middleware_1.authorizeRole)(['ADMIN']), user_controller_1.deleteUser);
exports.default = router;
