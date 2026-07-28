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

  const existingVoteIndex = poll.options.findIndex((opt) =>
    opt.voters.some((v) => v.toString() === userId.toString())
  );

  if (existingVoteIndex === optionIndex) {
    await Poll.updateOne(
      { _id: pollId, isActive: true },
      { $pull: { [`options.${optionIndex}.voters`]: userId } }
    );
  } else {
    for (let i = 0; i < poll.options.length; i++) {
      await Poll.updateOne(
        { _id: pollId, isActive: true },
        { $pull: { [`options.${i}.voters`]: userId } }
      );
    }
    await Poll.updateOne(
      { _id: pollId, isActive: true },
      { $push: { [`options.${optionIndex}.voters`]: userId } }
    );
  }

  const updatedPoll = await Poll.findById(pollId);

  return res.status(200).json(new ApiResponse(200, updatedPoll, "Vote recorded"));
});

export { voteOnPoll };
