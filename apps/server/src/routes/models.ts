import { Router as ExpressRouter, type Router } from "express";
import { SUPPORTED_MODEL_LIST } from "../providers/index.js";

export const modelsRouter: Router = ExpressRouter();

modelsRouter.get("/", (_req, res) => {
  res.json({ data: SUPPORTED_MODEL_LIST });
});
