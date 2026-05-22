import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/roles.js";

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.use(requireRoles("ADMIN"));

userRouter.get("/", userController.list);
userRouter.post("/", userController.create);
userRouter.put("/:id", userController.update);
userRouter.delete("/:id", userController.remove);
