"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const court_routes_1 = __importDefault(require("./court.routes"));
const reservation_routes_1 = __importDefault(require("./reservation.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/courts', court_routes_1.default);
router.use('/reservations', reservation_routes_1.default);
exports.default = router;
