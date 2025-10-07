export const cartApi = {
  addItem: async (itemId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (Math.random() > 0.5) {
      throw new Error('Server error: Failed to add item');
    }

    return { success: true, itemId };
  },
};
