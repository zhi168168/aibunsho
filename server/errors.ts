export class DetectionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
