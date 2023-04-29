export function getEpochMillisBeforeDay(beforeDay: number): number {
    const now = new Date();
    return now.setDate(now.getDate() - beforeDay);
}