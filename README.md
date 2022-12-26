# :mag: BTC Address Lookup (Master Thesis)
The goal of the thesis is creation of a tool for pinpointing owners of the Bitcoin addresses found on the internet. The data are collected in a PostgreSQL database by continuously crawling provided URLs and obtained directly from the source code. The scripts are built in Python and running on a remote server.

## :hammer_and_wrench: Database Builder [[db-builder](db-builder "Database Builder")]
### Features:
- :heavy_check_mark: The PostgreSQL database initializer
  - :hammer: Setup[^setup] *- installing required Python packages not yet implemented*
  - :heavy_check_mark: Reset[^reset]
- :heavy_check_mark: CRUD operations with the PostgreSQL database
- :heavy_check_mark: Multi-threaded downloading and processing[^multi-threaded]
- :heavy_check_mark: Automated run[^automated-run]
- :x: Complete database schema
- :hammer: Crawling all addresses / reports from the following sources[^robots-txt]:
  - :heavy_check_mark: [LoyceV](http://alladdresses.loyce.club "LoyceV")
    - :heavy_check_mark: Weekly updates with all BTC addresses (GZIP)
    - :heavy_check_mark: Daily updates (TXT)
  - :x: [BitcoinAbuse](https://www.bitcoinabuse.com/reports "BitcoinAbuse")
    - :x: Reported BTC addresses (HTML)
  - :x: [CheckBitcoinAddress](https://checkbitcoinaddress.com/abuse-reports-to-bitcoin-address "CheckBitcoinAddress")
    - :x: Reported BTC addresses (HTML)
  - :x: [CryptoBlacklist](https://www.cryptoblacklist.io "CryptoBlacklist")
    - :x: Searched reported BTC addresses (HTML)
    - :heavy_check_mark: Last reported ETH addresses (HTML)
  - :hammer: [Bitcoin Generator Scam](http://ssrg.site.uottawa.ca/bgsieeesb2020/#urls "Bitcoin Generator Scam")
    - :heavy_check_mark: Scam BTC addresses (TXT)
    - :hammer: Scam non-BTC addresses (TXT) *- address currency not yet specified*
  - :x: [BitcoinAIS](https://bitcoinais.com "BitcoinAIS")
    - :x: Reported BTC addresses (HTML)
  - :hammer: [CryptoScamDB](https://cryptoscamdb.org "CryptoScamDB")
    - :hammer: Reported addresses (JSON) *- address currency not yet specified*
  - :x: [Cryptscam](https://cryptscam.com "Cryptscam")
    - :x: Searched reported BTC addresses (HTML)
    - :hammer: Last Reported addresses (HTML) *- address currency not yet specified*
  - :x: [SeeKoin](https://www.seekoin.com/address.php "SeeKoin")
    - :x: Reported BTC addresses (HTML)
- :x: Parsing the data collected by the Crawler[^connecting-addresses-and-data]
- :x: Fulfilling the robots.txt rules[^robots-txt]
- :x: Exception handling

[^setup]: Installs required Python packages.\
  Creates PostgreSQL users, database and its tables. Fills the tables with the initial data.\
  Sets some performance parameters of the PostgreSQL server.\
  Restarts the PostgreSQL service.
[^reset]: Deletes PostgreSQL users, database and its tables.\
  Sets the default parameters of the PostgreSQL server.\
  Restarts the PostgreSQL service.
[^multi-threaded]: Uses multiple threads for crawling sources which do not contain new addresses (mainly reports).
[^automated-run]: The program automatically checks the availability of new data.\
  Once the new data are available, it downloads and stores them in the database and on the disk.\
  The program never stops unless it is terminated by the user or the operating system.
[^robots-txt]: The Crawler respects robots.txt rules of each source.
[^connecting-addresses-and-data]: The Parser connects the stored addresses and data.

## :earth_americas: Web Client [[client](client "Web Client")]
### Features:
- :x: Searching of BTC address
- :x: Searching of BTC address reports
- :x: Searching of BTC address owners
- :x: Account system
  - :x: Sign up / Sign in
  - :x: Roles

## :printer: Documentation [[documentation](documentation "Documentation")]
### Content:
- :memo: [Database dump](documentation/db-dump.sql "Database dump")
- :memo: [Database schema plan](documentation/db-schema-plan.png "Database schema plan")
- :memo: [ER diagram](documentation/er-diagram.png "ER diagram")

## :ice_cube: Crawler (Node.js) [[deprecated](deprecated "Crawler (Node.js)")]
*Crawler (Node.js) is now deprecated and has been replaced by the newer [Database Builder](#hammer_and_wrench-database-builder-db-builder "Database Builder")!*
### Features:
- :heavy_check_mark: CRUD operations with the MySQL database
- :heavy_check_mark: Multi-threaded downloading and processing
- :heavy_check_mark: Crawling tree limitation - max level (depth), max serial number (count), max delay (crawling frequency)
- :heavy_check_mark: Parsing the data collected by the Crawler