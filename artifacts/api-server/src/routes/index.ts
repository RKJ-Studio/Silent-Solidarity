import { Router, type IRouter } from "express";
import healthRouter from "./health";
import candlesRouter from "./candles";
import statsRouter from "./stats";
import locationsRouter from "./locations";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(candlesRouter);
router.use(statsRouter);
router.use(locationsRouter);
router.use(adminRouter);

export default router;
