//vraca poruku greske iz servera. ako server nije poslao poruku, onda daje rezervnu poruku
export const porukaGreske = (error, rezervna) => {
  return error?.response?.data?.message || rezervna;
};