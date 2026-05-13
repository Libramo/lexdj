import { db } from "@/drizzle/src";
import { laws, duplicateLaws } from "@/drizzle/src/db/schema";
import { notInArray } from "drizzle-orm";

export const excludeDuplicates = notInArray(
  laws.id,
  db.select({ id: duplicateLaws.id }).from(duplicateLaws),
);
