"use client";

import { TabTranslateWorkbench } from "./TabTranslateWorkbench";
import { useTabTranslateActions } from "./useTabTranslateActions";
import { useTabTranslateState } from "./useTabTranslateState";

export { SEG_JOIN, mapStoredToSegments, splitIntoSegments, upsertTranslatedEntry } from "./TabTranslate.logic";

export default function TabTranslate() {
  const state = useTabTranslateState();
  const actions = useTabTranslateActions(state);

  return <TabTranslateWorkbench state={state} actions={actions} />;
}
