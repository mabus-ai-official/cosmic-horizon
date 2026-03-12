import { Router } from "express";
import challengesRouter from "./challenges";
import sessionsRouter from "./sessions";
import rewardsRouter from "./rewards";

const router = Router();

router.use("/", challengesRouter);
router.use("/", sessionsRouter);
router.use("/", rewardsRouter);

export default router;
