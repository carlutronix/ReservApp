"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yamljs_1 = __importDefault(require("yamljs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const routes_1 = __importDefault(require("./routes"));
const prisma_1 = __importDefault(require("./config/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Seed Courts and Admin
const seedData = async () => {
    try {
        // Seed Courts
        const courtCount = await prisma_1.default.court.count();
        if (courtCount === 0) {
            console.log('Seeding initial courts...');
            await prisma_1.default.court.createMany({
                data: [
                    { name: 'Padel Indoor 1', type: 'Indoor', surface: 'Blue Turf', pricePerHour: 20, sport: 'Padel' },
                    { name: 'Padel Indoor 2', type: 'Indoor', surface: 'Blue Turf', pricePerHour: 20, sport: 'Padel' },
                    { name: 'Padel Outdoor 1', type: 'Outdoor', surface: 'Green Turf', pricePerHour: 15, sport: 'Padel' },
                    { name: 'Tennis Court 1', type: 'Outdoor', surface: 'Clay', pricePerHour: 25, sport: 'Tennis' },
                    { name: 'Basketball Court 1', type: 'Indoor', surface: 'Hardwood', pricePerHour: 30, sport: 'Basketball' },
                    { name: 'Football Field 1', type: 'Outdoor', surface: 'Grass', pricePerHour: 50, sport: 'Football' },
                    { name: 'Volleyball Court 1', type: 'Indoor', surface: 'Synthetic', pricePerHour: 20, sport: 'Volleyball' },
                ]
            });
            console.log('Courts seeded successfully');
        }
        // Seed Admin
        const adminEmail = 'admin@gmail.com';
        const existingAdmin = await prisma_1.default.user.findUnique({ where: { email: adminEmail } });
        if (!existingAdmin) {
            console.log('Seeding admin user...');
            const hashedPassword = await bcryptjs_1.default.hash('admin', 10);
            await prisma_1.default.user.create({
                data: {
                    email: adminEmail,
                    password: hashedPassword,
                    name: 'Admin User',
                    role: 'ADMIN',
                },
            });
            console.log('Admin user seeded successfully');
        }
    }
    catch (error) {
        console.error('Error seeding data:', error);
    }
};
seedData();
// Middleware
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
// Swagger
try {
    const swaggerDocument = yamljs_1.default.load(path_1.default.join(__dirname, '../swagger.yaml'));
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
}
catch (error) {
    console.warn('Swagger file not found or invalid');
}
// Routes
app.use('/api', routes_1.default);
// Health Check
app.get('/', (req, res) => {
    res.send('ReservApp API is running');
});
// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
