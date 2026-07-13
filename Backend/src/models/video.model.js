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
    },
    category:{
        type:String,
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
    isPaid:{
        type:Boolean,
        default:false,
    },
    price:{
        type:Number,
        default:0,
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
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
