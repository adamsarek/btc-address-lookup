# BTC Address Lookup (Master Thesis)
The goal of the thesis is creation of a tool for pinpointing owners of the Bitcoin addresses found on the internet. The tool also provides other useful information such as where was the address found, who posted it and what format it uses. The data are collected in a MySQL database by continuously crawling provided URLs and obtained directly from the HTML code by so called "Crawler" and "Scraper" scripts. The scripts are built in JavaScript and running on a server using a Node.js runtime. For optimal performance of the server, which is also used for communicating with a user, are the scripts run in so called worker thread. Each thread has its own lifecycle which does not interrupt other threads execution.

## Server
#### Currently supports:
- communication with the user using a JSON formatted text
- read/write operations with the MySQL database

## Crawler
#### Currently supports:
- communication with the server (main thread) using a JSON formatted text
- read/write operations with the MySQL database
- setting crawling tree limitation - max level (depth), max serial number (count), max delay (crawling frequency)
- fetching a content of the provided URLs, parsing the HTML and obtaining additional links for further crawling
#### In progress:
- crawler URL filter (for specific websites)

## Scraper
#### Currently supports:
- communication with the server (main thread) using a JSON formatted text
- read/write operations with the MySQL database
#### In progress:
- searching occurrences of the BTC addresses and the accounts posting them from the crawled HTML (general-purpose & for specific websites)
