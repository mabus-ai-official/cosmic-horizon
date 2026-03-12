import { Router } from "express";
import challengesRouter from "./challenges";
import sessionsRouter from "./sessions";
import rewardsRouter from "./rewards";
import shopRouter from "./shop";

const router = Router();

router.use("/", challengesRouter);
router.use("/", sessionsRouter);
router.use("/", rewardsRouter);
router.use("/", shopRouter);

export default router;
