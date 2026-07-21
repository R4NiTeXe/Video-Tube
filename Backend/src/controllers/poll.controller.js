import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Poll } from "../models/poll.model.js";

const voteOnPoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const { optionIndex } = req.body;

  if (optionIndex === undefined || optionIndex === null || typeof optionIndex !== "number") {
    throw new ApiError(400, "Option index is required");
  }

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  if (!poll.isActive) {
    throw new ApiError(400, "Poll is closed");
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    throw new ApiError(400, "Invalid option index");
  }

  const userId = req.user._id;

  for (const opt of poll.options) {
    if (opt.voters.some((v) => v.toString() === userId.toString())) {
      throw new ApiError(400, "You have already voted on this poll");
    }
  }

  poll.options[optionIndex].voters.push(userId);
  await poll.save();

  return res.status(200).json(new ApiResponse(200, poll, "Vote recorded"));
});

export { voteOnPoll };
