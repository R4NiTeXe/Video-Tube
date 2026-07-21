import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
  reorderPlaylist,
  getChannelPlaylists,
  getPublicPlaylists,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validation.middleware.js";
import { playlistSchemas } from "../validators/index.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(validateBody(playlistSchemas.createPlaylist.body), createPlaylist);
router.route("/public").get(validateQuery(playlistSchemas.getPublicPlaylists.query), getPublicPlaylists);
router.route("/channel/:username").get(validateParams(playlistSchemas.getChannelPlaylists.params), validateQuery(playlistSchemas.getChannelPlaylists.query), getChannelPlaylists);
router
  .route("/:playlistId")
  .get(validateParams(playlistSchemas.getPlaylistById.params), getPlaylistById)
  .patch(validateParams(playlistSchemas.updatePlaylist.params), validateBody(playlistSchemas.updatePlaylist.body), updatePlaylist)
  .delete(validateParams(playlistSchemas.deletePlaylist.params), deletePlaylist);

router.route("/:playlistId/reorder").patch(validateParams(playlistSchemas.reorderPlaylist.params), validateBody(playlistSchemas.reorderPlaylist.body), reorderPlaylist);
router.route("/add/:videoId/:playlistId").patch(validateParams(playlistSchemas.addVideoToPlaylist.params), addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(validateParams(playlistSchemas.removeVideoFromPlaylist.params), removeVideoFromPlaylist);
router.route("/user/:userId").get(validateParams(playlistSchemas.getUserPlaylists.params), validateQuery(playlistSchemas.getUserPlaylists.query), getUserPlaylists);

export default router;
