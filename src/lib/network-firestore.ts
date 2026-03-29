// Backward compatibility — re-export from modular network/ directory
export {
  requireDb, normalizeText, COLLECTIONS, nowIso,
  ensureNetworkUserRecord, getNetworkUserRecord,
  createPlanetWithFirstLog, createPost, createSettlement, createBoardPost,
  getPlanetById, getPostById, listLatestPlanets, listPlanetPosts, getPlanetsByIds,
  listLatestPosts, listCommentsForPost, getAllUniqueTags,
  listLatestSettlements, listPlanetSettlements, listPlanetsByOwner,
  addBookmark, removeBookmark, listBookmarks, isBookmarked,
  addComment, updateComment, deleteComment,
  toggleReaction, getReactions,
  submitReport, listReports, updateReportStatus,
} from "./network";
