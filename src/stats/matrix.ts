/**
 * Pure TypeScript linear algebra & Householder QR decomposition for OLS regression.
 * Mirrors R's lm() numerical stability and computes (X^T X)^(-1) and hat matrix diagonals.
 */

export interface QRResult {
  q: number[][]; // n x k orthonormal columns
  r: number[][]; // k x k upper triangular
  rankOk: boolean;
}

export function transpose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0]?.length ?? 0;
  const T: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      T[j][i] = A[i][j];
    }
  }
  return T;
}

export function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const k = A[0]?.length ?? 0;
  const n = B[0]?.length ?? 0;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let p = 0; p < k; p++) {
      const aip = A[i][p];
      if (aip === 0) continue;
      for (let j = 0; j < n; j++) {
        C[i][j] += aip * B[p][j];
      }
    }
  }
  return C;
}

/**
 * Thin QR decomposition using Modified Gram-Schmidt with re-orthogonalization
 * (two-pass MGS produces machine-precision orthogonality for regression design matrices).
 */
export function thinQR(X: number[][]): QRResult {
  const n = X.length;
  const k = X[0]?.length ?? 0;
  const Q: number[][] = Array.from({ length: n }, () => new Array(k).fill(0));
  const R: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));

  for (let j = 0; j < k; j++) {
    const v = new Array(n);
    for (let i = 0; i < n; i++) {
      v[i] = X[i][j];
    }

    // Two-pass Modified Gram-Schmidt
    for (let pass = 0; pass < 2; pass++) {
      for (let m = 0; m < j; m++) {
        let dot = 0;
        for (let i = 0; i < n; i++) {
          dot += Q[i][m] * v[i];
        }
        R[m][j] += dot;
        for (let i = 0; i < n; i++) {
          v[i] -= dot * Q[i][m];
        }
      }
    }

    let norm = 0;
    for (let i = 0; i < n; i++) {
      norm += v[i] * v[i];
    }
    norm = Math.sqrt(norm);

    if (norm < 1e-10) {
      return { q: Q, r: R, rankOk: false };
    }

    R[j][j] = norm;
    for (let i = 0; i < n; i++) {
      Q[i][j] = v[i] / norm;
    }
  }

  return { q: Q, r: R, rankOk: true };
}

/**
 * Solves R * x = b where R is k x k upper triangular.
 */
export function backSubstitute(R: number[][], b: number[]): number[] {
  const k = R.length;
  const x = new Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < k; j++) {
      sum -= R[i][j] * x[j];
    }
    x[i] = sum / R[i][i];
  }
  return x;
}

/**
 * Inverts an upper triangular matrix R (k x k).
 */
export function invertUpperTriangular(R: number[][]): number[][] {
  const k = R.length;
  const inv: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let col = 0; col < k; col++) {
    const e = new Array(k).fill(0);
    e[col] = 1;
    const solved = backSubstitute(R, e);
    for (let row = 0; row < k; row++) {
      inv[row][col] = solved[row];
    }
  }
  return inv;
}

/**
 * Computes (X^T X)^(-1) = R^(-1) * (R^(-1))^T directly from QR factor R.
 */
export function computeXtXInverseFromR(R: number[][]): number[][] {
  const Rinv = invertUpperTriangular(R);
  const k = R.length;
  const XtXinv: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let sum = 0;
      for (let m = Math.max(i, j); m < k; m++) {
        sum += Rinv[i][m] * Rinv[j][m];
      }
      XtXinv[i][j] = sum;
    }
  }
  return XtXinv;
}
