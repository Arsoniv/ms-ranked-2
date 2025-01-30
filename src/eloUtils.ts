export function calculateEloChange(currentWinnerElo: number, currentLoserElo: number, kFactor: number): { newWinnerElo: number, newLoserElo: number } {

    const expectedWinner = 1 / (1 + Math.pow(10, (currentLoserElo - currentWinnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (currentWinnerElo - currentLoserElo) / 400));

    const newWinnerElo = Math.round(currentWinnerElo + kFactor * (1 - expectedWinner));
    const newLoserElo = Math.round(currentLoserElo + kFactor * (0 - expectedLoser));

    return { newWinnerElo, newLoserElo };
}
