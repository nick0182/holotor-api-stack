export class BonusVideoAlreadyDeletedException extends Error {
  private readonly video_id: string;

  constructor(video_id: string) {
    super(`Bonus video ${video_id} has already been deleted`);
    this.name = "BonusVideoAlreadyDeletedException";
    this.video_id = video_id;

    Object.setPrototypeOf(this, Error.prototype);
  }
}
