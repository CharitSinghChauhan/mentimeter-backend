export const wsSuccessResponse = <T>(message: string, payload: T) => {
  return {
    success: true,
    message,
    payload,
  };
};

export const wsFailedResponse = <T>(message: string, payload: T) => {
  return {
    success: false,
    message,
    payload,
  };
};
