import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const qualitySchema = new Schema(
  {
    resolution: { type: String, required: true },
    url: { type: String, required: true },
    bitrate: { type: Number },
  },
  { _id: false }
);

const videoSchema = new Schema(
  {
    videoFile:{
        type: String,   
        required:true,
    },
    thumbnail:{
        type:String,
        required:true,
    },
    title:{
        type:String,
        required:true,
        index:true,
    },
    description:{
        type:String,
        required:true,
        maxlength: 5000,
    },
    duration:{
        type:Number,
        required:true,
    },
    views:{
        type:Number,
        default:0,
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    isPublished:{
        type:Boolean,
        default:true,
    },
    tags:{
        type:[String],
        default:[],
        validate: {
            validator: (v) => !v || v.every((t) => t.length <= 50),
            message: "Each tag must be 50 characters or less",
        },
    },
    category:{
        type:String,
        enum: ["General", "Gaming", "Music", "Education", "Entertainment", "Sports", "News", "Technology", "Science", "Travel", "Food", "Fashion", "Art", "Podcasts"],
        default:"General",
    },
    chapters:[{
        title:{ type:String },
        startTime:{ type:Number },
    }],
    scheduledAt:{
        type:Date,
    },
    likesCount:{
        type:Number,
        default:0,
    },
    commentsCount:{
        type:Number,
        default:0,
    },
    isShort:{
        type:Boolean,
        default:false,
    },
    hlsUrl:{
        type:String,
        default:"",
    },
    qualities:[qualitySchema],
    transcodingStatus:{
        type:String,
        enum:["pending","processing","completed","failed"],
        default:"pending",
    },
    trendingScore:{
        type:Number,
        default:0,
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.index({ owner: 1, createdAt: -1 });
videoSchema.index({ category: 1, isPublished: 1, createdAt: -1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ views: -1 });
videoSchema.index({ isPublished: 1, createdAt: -1 });
videoSchema.index({ isPublished: 1, scheduledAt: 1 });
videoSchema.index({ owner: 1, isPublished: 1, createdAt: -1 });
videoSchema.index({ trendingScore: -1, isPublished: 1 });
videoSchema.index({ scheduledAt: 1 });
videoSchema.index({ transcodingStatus: 1 });
videoSchema.index({ title: "text", description: "text" });
videoSchema.index({ duration: 1 });

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
