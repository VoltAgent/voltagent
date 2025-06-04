const blogPluginExports = require("@docusaurus/plugin-content-blog");
const utils = require("@docusaurus/utils");
const path = require("node:path");

const defaultBlogPlugin = blogPluginExports.default;

const pluginDataDirRoot = path.join(
  ".docusaurus",
  "docusaurus-plugin-content-blog",
);
const aliasedSource = (source) =>
  `~blog/${utils.posixPath(path.relative(pluginDataDirRoot, source))}`;

function paginateBlogPosts({
  blogPosts,
  basePageUrl,
  blogTitle,
  blogDescription,
  postsPerPageOption,
}) {
  const totalCount = blogPosts.length;
  const postsPerPage =
    postsPerPageOption === "ALL" ? totalCount : postsPerPageOption;

  const numberOfPages = Math.ceil(totalCount / postsPerPage);

  const pages = [];

  function permalink(page) {
    return page > 0
      ? utils.normalizeUrl([basePageUrl, `page/${page + 1}`])
      : basePageUrl;
  }

  for (let page = 0; page < numberOfPages; page += 1) {
    pages.push({
      items: blogPosts
        .slice(page * postsPerPage, (page + 1) * postsPerPage)
        .map((item) => item.id),
      metadata: {
        permalink: permalink(page),
        page: page + 1,
        postsPerPage,
        totalPages: numberOfPages,
        totalCount,
        previousPage: page !== 0 ? permalink(page - 1) : undefined,
        nextPage: page < numberOfPages - 1 ? permalink(page + 1) : undefined,
        blogDescription,
        blogTitle,
      },
    });
  }

  return pages;
}

function getMultipleRandomElement(arr, num) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, num);
}

function getReletadPosts(allBlogPosts, metadata) {
  const relatedPosts = allBlogPosts.filter(
    (post) =>
      post.metadata.frontMatter.tags?.some((tag) =>
        metadata.frontMatter.tags?.includes(tag),
      ) && post.metadata.title !== metadata.title,
  );

  const randomThreeRelatedPosts = getMultipleRandomElement(relatedPosts, 3);

  const filteredPostInfos = randomThreeRelatedPosts.map((post) => {
    return {
      title: post.metadata.title,
      description: post.metadata.description,
      permalink: post.metadata.permalink,
      formattedDate: post.metadata.formattedDate,
      authors: post.metadata.authors,
      readingTime: post.metadata.readingTime,
      date: post.metadata.date,
    };
  });

  return filteredPostInfos;
}

function getAuthorPosts(allBlogPosts, metadata) {
  const authorPosts = allBlogPosts.filter(
    (post) =>
      post.metadata.frontMatter.authors === metadata.frontMatter.authors &&
      post.metadata.title !== metadata.title,
  );

  const randomThreeAuthorPosts = getMultipleRandomElement(authorPosts, 3);

  const filteredPostInfos = randomThreeAuthorPosts.map((post) => {
    return {
      title: post.metadata.title,
      description: post.metadata.description,
      permalink: post.metadata.permalink,
      formattedDate: post.metadata.formattedDate,
      authors: post.metadata.authors,
      readingTime: post.metadata.readingTime,
      date: post.metadata.date,
    };
  });

  return filteredPostInfos;
}

function getAllTags(allBlogPosts) {
  // Collect tags and calculate their counts
  const tagCounts = {};
  allBlogPosts.forEach((post) => {
    const postTags = post.metadata.frontMatter.tags || [];
    postTags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  // Format tags
  const formattedTags = Object.entries(tagCounts).map(([label, count]) => {
    // Convert to Docusaurus tag URL format
    const tagPermalink = label
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-") // Convert multiple dashes to a single dash
      .replace(/^-|-$/g, ""); // Remove leading and trailing dashes

    return {
      label,
      count,
      permalink: `/blog/tags/${tagPermalink}`,
    };
  });

  // Sort tags by count
  return formattedTags.sort((a, b) => b.count - a.count);
}

async function blogPluginExtended(...pluginArgs) {
  const blogPluginInstance = await defaultBlogPlugin(...pluginArgs);

  const { blogTitle, blogDescription, postsPerPage } = pluginArgs[1];

  return {
    // Add all properties of the default blog plugin so existing functionality is preserved
    ...blogPluginInstance,
    /**
     * Override the default `contentLoaded` hook to access blog posts data
     */
    contentLoaded: async (data) => {
      const { content: blogContents, actions } = data;
      const { addRoute, createData } = actions;
      const {
        blogPosts: allBlogPosts,
        blogTags,
        blogTagsListPath,
      } = blogContents;

      const blogItemsToMetadata = {};

      function blogPostItemsModule(items) {
        return items.map((postId) => {
          const blogPostMetadata = blogItemsToMetadata[postId];

          return {
            content: {
              __import: true,
              path: blogPostMetadata.source,
              query: {
                truncated: true,
              },
            },
          };
        });
      }

      const featuredBlogPosts = allBlogPosts.filter(
        (post) => post.metadata.frontMatter.is_featured === true,
      );

      const blogPosts = allBlogPosts.filter(
        (post) => post.metadata.frontMatter.is_featured !== true,
      );

      const blogListPaginated = paginateBlogPosts({
        blogPosts,
        basePageUrl: "/blog",
        blogTitle,
        blogDescription,
        postsPerPageOption: postsPerPage,
      });

      // Create routes for blog entries.
      await Promise.all(
        allBlogPosts.map(async (blogPost) => {
          const { id, metadata } = blogPost;

          const relatedPosts = getReletadPosts(allBlogPosts, metadata);
          const authorPosts = getAuthorPosts(allBlogPosts, metadata);

          await createData(
            `${utils.docuHash(metadata.source)}.json`,
            JSON.stringify({ ...metadata, relatedPosts, authorPosts }, null, 2),
          );

          addRoute({
            path: metadata.permalink,
            component: "@theme/BlogPostPage",
            exact: true,
            modules: {
              content: metadata.source,
            },
          });

          blogItemsToMetadata[id] = metadata;
        }),
      );

      // Calculate all tags for blog list page
      const allTags = getAllTags(allBlogPosts);

      // Create routes for blog's paginated list entries.
      await Promise.all(
        blogListPaginated.map(async (listPage) => {
          const { metadata, items } = listPage;
          const { permalink } = metadata;

          const pageMetadataPath = await createData(
            `${utils.docuHash(permalink)}.json`,
            JSON.stringify({ ...metadata, allTags }, null, 2),
          );

          const tagsProp = Object.values(blogTags).map((tag) => ({
            label: tag.label,
            permalink: tag.permalink,
            count: tag.items.length,
          }));

          const tagsPropPath = await createData(
            `${utils.docuHash(`${blogTagsListPath}-tags`)}.json`,
            JSON.stringify(tagsProp, null, 2),
          );

          addRoute({
            path: permalink,
            component: "@theme/BlogListPage",
            exact: true,
            modules: {
              items: blogPostItemsModule(
                permalink === "/blog"
                  ? [...items, ...featuredBlogPosts.map((post) => post.id)]
                  : items,
              ),
              metadata: aliasedSource(pageMetadataPath),
              tags: aliasedSource(tagsPropPath),
            },
          });
        }),
      );

      const authorsArray = allBlogPosts
        .map((post) => post.metadata.frontMatter.authors)
        .filter((authorName) => authorName !== undefined);
      const uniqueAuthors = [...new Set(authorsArray)];

      await Promise.all(
        uniqueAuthors.map(async (author) => {
          const authorPosts = allBlogPosts.filter(
            (post) => post.metadata.frontMatter.authors === author,
          );

          const authorListPaginated = paginateBlogPosts({
            blogPosts: authorPosts,
            basePageUrl: `/blog/author/${author
              .toLowerCase()
              .replace(/_/g, "-")}`,
            blogTitle: `Posts by ${author}`,
            blogDescription: `Blog posts written by ${author}`,
            postsPerPageOption: "ALL",
          });

          await Promise.all(
            authorListPaginated.map(async (authorListPage) => {
              const { metadata, items } = authorListPage;
              const { permalink } = metadata;

              // Create author metadata
              const authorMetadataPath = await createData(
                `${utils.docuHash(permalink)}.json`,
                JSON.stringify(
                  {
                    ...metadata,
                    author,
                    authorPosts: authorPosts.map((post) => ({
                      title: post.metadata.title,
                      description: post.metadata.description,
                      permalink: post.metadata.permalink,
                      formattedDate: post.metadata.formattedDate,
                      readingTime: post.metadata.readingTime,
                      date: post.metadata.date,
                    })),
                  },
                  null,
                  2,
                ),
              );

              addRoute({
                path: permalink,
                component: "@theme/BlogAuthorPage",
                exact: true,
                modules: {
                  items: blogPostItemsModule(items),
                  metadata: aliasedSource(authorMetadataPath),
                },
              });
            }),
          );
        }),
      );

      // Tags. This is the last part so we early-return if there are no tags.
      if (Object.keys(blogTags).length === 0) {
        return;
      }

      async function createTagsListPage() {
        const tagsProp = Object.values(blogTags).map((tag) => ({
          label: tag.label,
          permalink: tag.permalink,
          count: tag.items.length,
        }));

        const tagsPropPath = await createData(
          `${utils.docuHash(`${blogTagsListPath}-tags`)}.json`,
          JSON.stringify(tagsProp, null, 2),
        );

        addRoute({
          path: blogTagsListPath,
          component: "@theme/BlogTagsListPage",
          exact: true,
          modules: {
            tags: aliasedSource(tagsPropPath),
          },
        });
      }

      async function createTagPostsListPage(tag) {
        await Promise.all(
          tag.pages.map(async (blogPaginated) => {
            const { metadata, items } = blogPaginated;
            const tagProp = {
              label: tag.label,
              permalink: tag.permalink,
              allTagsPath: blogTagsListPath,
              count: tag.items.length,
            };
            const tagPropPath = await createData(
              `${utils.docuHash(metadata.permalink)}.json`,
              JSON.stringify(tagProp, null, 2),
            );

            const listMetadataPath = await createData(
              `${utils.docuHash(metadata.permalink)}-list.json`,
              JSON.stringify(metadata, null, 2),
            );

            // Calculate all tags for the tag posts page
            const allTags = getAllTags(allBlogPosts);

            const tagsPropPath = await createData(
              `${utils.docuHash(`${metadata.permalink}-tags`)}.json`,
              JSON.stringify({ allTags }, null, 2),
            );

            addRoute({
              path: metadata.permalink,
              component: "@theme/BlogTagsPostsPage",
              exact: true,
              modules: {
                items: blogPostItemsModule(items),
                tag: aliasedSource(tagPropPath),
                tags: aliasedSource(tagsPropPath),
                listMetadata: aliasedSource(listMetadataPath),
              },
            });
          }),
        );
      }

      await createTagsListPage();
      await Promise.all(Object.values(blogTags).map(createTagPostsListPage));
    },
  };
}

module.exports = {
  ...blogPluginExports,
  default: blogPluginExtended,
};
