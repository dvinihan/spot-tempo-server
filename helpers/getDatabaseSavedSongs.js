export const getDatabaseSavedSongs = async (db, userId) => {
  const document = await db.collection("saved-songs").findOne({ user: userId });
  return document?.songs ?? [];
};
