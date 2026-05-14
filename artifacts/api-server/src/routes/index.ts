import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessesRouter from "./businesses";
import auditsRouter from "./audits";
import actionPlansRouter from "./actionPlans";
import suppliersRouter from "./suppliers";
import progressRouter from "./progress";
import esgReportsRouter from "./esgReports";
import agentRouter from "./agent";
import greenlendRouter from "./greenlend";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessesRouter);
router.use(auditsRouter);
router.use(actionPlansRouter);
router.use(suppliersRouter);
router.use(progressRouter);
router.use(esgReportsRouter);
router.use(agentRouter);
router.use(greenlendRouter);

export default router;
