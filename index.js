const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

function parsePodcastJson(json) {
    const rssFeedItems = [];
    
    if (!json.data || !Array.isArray(json.data)) {
        throw new Error("Invalid JSON format: 'data' field is missing or not an array.");
    }

    json.data.forEach(item => {
        const baseUrl = item.baseUrl;
        const localized = item.l10n && item.l10n[0];
        const audio = localized && localized.audios && localized.audios[0];

        if (baseUrl && localized && audio) {
            rssFeedItems.push({
                url: localized.metadata.url || baseUrl, // Use metadata URL if available, fallback to baseUrl
                title: localized.title,
                date: localized.publishedAt,
                guid: item.publicId,
                enclosure: `${baseUrl}/${audio.file}`,
            });
        }
    });

    return rssFeedItems;
}

function generatePodcastRSS(feedItems, options) {
    const {
        title,
        description,
        link,
        language = "en-us",
        copyright,
        managingEditor,
        webMaster,
        category,
        itunesAuthor,
        itunesOwnerName,
        itunesOwnerEmail,
        itunesImage,
        itunesExplicit = "no",
    } = options;

    if (!feedItems || !Array.isArray(feedItems) || feedItems.length === 0) {
        throw new Error("Feed items array is empty or invalid.");
    }

    const escapeXML = (str) =>
        str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

    const rssItems = feedItems
        .map((item) => {
            const title = escapeXML(item.title);
            const description = escapeXML(item.title); // Use title as a placeholder for description if not provided
            const pubDate = new Date(item.date).toUTCString();
            const enclosure = `<enclosure url="${escapeXML(item.enclosure)}" type="audio/mpeg" />`;

            return `
                <item>
                    <title>${title}</title>
                    <description>${description}</description>
                    <pubDate>${pubDate}</pubDate>
                    <guid>${item.guid}</guid>
                    ${enclosure}
                    <link>${escapeXML(item.url)}</link>
                </item>
            `;
        })
        .join("\n");

    const rss = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
            <channel>
                <title>${escapeXML(title)}</title>
                <description>${escapeXML(description)}</description>
                <link>${escapeXML(link)}</link>
                <language>${language}</language>
                <copyright>${escapeXML(copyright)}</copyright>
                <managingEditor>${escapeXML(managingEditor)}</managingEditor>
                <webMaster>${escapeXML(webMaster)}</webMaster>
                <itunes:author>${escapeXML(itunesAuthor)}</itunes:author>
                <itunes:explicit>${escapeXML(itunesExplicit)}</itunes:explicit>
                <itunes:owner>
                    <itunes:name>${escapeXML(itunesOwnerName)}</itunes:name>
                    <itunes:email>${escapeXML(itunesOwnerEmail)}</itunes:email>
                </itunes:owner>
                <itunes:image href="${escapeXML(itunesImage)}" />
                <itunes:category text="${escapeXML(category)}" />
                ${rssItems}
            </channel>
        </rss>
    `;

    return rss.trim();
}

async function fetchAndGenerateRSS(url, outputFilePath, options) {
    try {
        console.log(`Fetching JSON data from ${url}...`);
        const response = await axios.get(url);

        if (response.status !== 200) {
            throw new Error(`Failed to fetch data. Status: ${response.status}`);
        }

        console.log("Parsing podcast JSON...");
        const feedItems = parsePodcastJson(response.data);

        console.log("Generating RSS feed...");
        const rssFeed = generatePodcastRSS(feedItems, options);

        console.log(`Writing RSS feed to ${outputFilePath}...`);
        await fs.writeFile(path.resolve(outputFilePath), rssFeed, "utf8");

        console.log("RSS feed successfully written!");
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

// Example script usage:
// Call this function with appropriate arguments in the terminal script
const url = "https://gmg-posts-api.global.ssl.fastly.net/1/dossier/43/posts?apikey=1JrO3kC72XItBqET&apitoken=tsfiqogiwkcugyug&per_page=10&page=1&sort=-publishedAt&filter[isoLanguage]=pt&include=audios,authors,dossiers,labels"; // Replace with your JSON URL
const outputFilePath = "./podcast-feed.xml";    // Replace with your desired output file path
const options = {
    title: "A Playlist de...",
    description: "Podcast não oficial do programa da TSF.",
    link: "https://github.com/andreparames/a-playlist-de-feed/",
    language: "pt-pt",
    copyright: "Copyright 2024, TSF",
    managingEditor: "",
    webMaster: "",
    category: "Education",
    itunesAuthor: "andreparames",
    itunesOwnerName: "andreparames",
    itunesOwnerEmail: "podcast@andreparames.com",
    itunesImage: "https://example.com/podcast-cover.jpg",
    itunesExplicit: "no",
};

fetchAndGenerateRSS(url, outputFilePath, options);
