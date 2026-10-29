ALTER TABLE "Post"
ADD COLUMN "mediaType" "MediaType" NOT NULL DEFAULT 'IMAGE';

CREATE INDEX "Post_mediaType_published_createdAt_idx"
ON "Post"("mediaType", "published", "createdAt");
