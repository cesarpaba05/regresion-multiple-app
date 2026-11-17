declare module 'jstat' {
  export const jStat: {
    studentt: {
      cdf(x: number, dof: number): number;
      inv(p: number, dof: number): number;
    };
    centralF: {
      cdf(x: number, df1: number, df2: number): number;
      inv(p: number, df1: number, df2: number): number;
    };
    normal: {
      cdf(x: number, mean: number, std: number): number;
      inv(p: number, mean: number, std: number): number;
    };
    chisquare: {
      cdf(x: number, dof: number): number;
    };
  };
  export default jStat;
}
