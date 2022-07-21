# BTC Address Lookup (Master Thesis)
The goal of the thesis is creation of a tool for pinpointing owners of the Bitcoin addresses found on the internet. The tool also provides other useful information such as where was the address found, who posted it and what format it uses. The data are collected by continuously crawling provided URLs and obtained directly from the HTML code by so called "Crawler" and "Scraper" scripts. The scripts for are built in JavaScript and running on a server using a Node.js runtime. For optimal performance of the server, which is also used for communicating with a user, are the scripts run outside of the main thread in so called worker thread. Each thread has its own lifecycle which means it does not block other threads execution.
