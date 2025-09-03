import { Bucket } from "encore.dev/storage/objects";

export const exportBucket = new Bucket("tinycdp-exports", {
  public: true,
});
