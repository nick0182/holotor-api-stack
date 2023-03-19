export interface UserVideos {
    user_id: StringData,
    video_retrieval_ts: NumberData,
    video_id: StringData,
    video_name: StringData
}

export interface StringData {
    S: string
}

export interface NumberData {
    N: string
}