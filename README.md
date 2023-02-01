# :mag: BTC Address Lookup (Master Thesis)
The goal of the thesis is creation of a tool for pinpointing owners of the Bitcoin addresses found on the internet. The data are collected in a PostgreSQL database by continuously crawling provided URLs and obtained directly from the source code. The scripts are built in Python and running on a remote server.

## :hammer_and_wrench: Database Builder [[db_builder](db_builder "Database Builder")]
### Features:
- :heavy_check_mark: The PostgreSQL database initializer
  - :heavy_check_mark: Setup[^setup]
  - :heavy_check_mark: Reset[^reset]
- :heavy_check_mark: Multi-threaded downloading and processing[^multi_threaded]
- :heavy_check_mark: Automated run[^automated_run]
- :heavy_check_mark: Fulfilling the robots.txt rules[^robots_txt]
- :heavy_check_mark: Complete database schema
  - :heavy_check_mark: **source** *- contains names of the sources of addresses and reports*
  - :heavy_check_mark: **currency** *- contains all of the available blockchains from [Blockchair](https://blockchair.com/ "Blockchair")*
  - :heavy_check_mark: **source_label** *- contains labels of the sources (subcategory of the sources)*
  - :heavy_check_mark: **address** *- contains BTC and other cryptocurrency addresses*
  - :heavy_check_mark: **url** *- contains unique urls gathered during crawling*
  - :heavy_check_mark: **source_label_url** *- contains starting urls for the labels of the sources (each label can have multiple starting urls)*
  - :heavy_check_mark: **data** *- contains relative links to the crawled data*
  - :heavy_check_mark: **role** *- contains user roles with various levels of access to the crawled data*
  - :heavy_check_mark: **account** *- contains information about the user account*
  - :heavy_check_mark: **token** *- contains API tokens with various levels of access to the crawled data*
  - :heavy_check_mark: **address_data** *- contains connection between cryptocurrency addresses and their respective crawled data*
- :hammer: Crawling all addresses / reports from the following sources[^robots_txt]:
  - :heavy_check_mark: [LoyceV](http://alladdresses.loyce.club "LoyceV")
    - :heavy_check_mark: Weekly updates with all BTC addresses (GZIP)
    - :heavy_check_mark: Daily updates (TXT)
  - :heavy_check_mark: [BitcoinAbuse](https://www.bitcoinabuse.com/reports "BitcoinAbuse")
    - :heavy_check_mark: Reported addresses (HTML)[^altcoins]
  - :heavy_check_mark: [CheckBitcoinAddress](https://checkbitcoinaddress.com/abuse-reports-to-bitcoin-address "CheckBitcoinAddress")
    - :heavy_check_mark: Reported addresses (HTML)[^altcoins]
  - :heavy_check_mark: [CryptoBlacklist](https://www.cryptoblacklist.io "CryptoBlacklist")
    - :heavy_check_mark: Searched reported BTC addresses (HTML)[^useful_data]
    - :heavy_check_mark: Last reported ETH addresses (HTML)
  - :heavy_check_mark: [Bitcoin Generator Scam](http://ssrg.site.uottawa.ca/bgsieeesb2020/#urls "Bitcoin Generator Scam")
    - :heavy_check_mark: Scam BTC addresses (TXT)
    - :heavy_check_mark: Scam non-BTC addresses (TXT)[^altcoins]
  - :heavy_check_mark: [BitcoinAIS](https://bitcoinais.com "BitcoinAIS")
    - :heavy_check_mark: Reported addresses (HTML)[^altcoins]
  - :heavy_check_mark: [CryptoScamDB](https://cryptoscamdb.org "CryptoScamDB")
    - :heavy_check_mark: Reported addresses (JSON)[^altcoins]
  - :heavy_check_mark: [Cryptscam](https://cryptscam.com "Cryptscam")
    - :heavy_check_mark: Searched reported BTC addresses (HTML)[^useful_data]
    - :heavy_check_mark: Last reported addresses (HTML)[^altcoins]
  - :heavy_check_mark: [SeeKoin](https://www.seekoin.com/address.php "SeeKoin")
    - :heavy_check_mark: Reported BTC addresses (HTML)[^useful_data]
  - :heavy_check_mark: [BitcoinWhosWho](https://www.bitcoinwhoswho.com "BitcoinWhosWho")
    - :heavy_check_mark: Searched reported BTC addresses (HTML)[^useful_data]
  - :x: [WalletExplorer](https://www.walletexplorer.com "WalletExplorer")
    - :x: Labeled BTC addresses (JSON + HTML)
- :heavy_check_mark: Connecting the crawled addresses and data[^connecting_addresses_and_data]
- :hammer: Exception handling

[^setup]: Creates PostgreSQL users, database and its tables.\
  Fills the tables with the initial data.\
  Sets some performance parameters of the PostgreSQL server.\
  Restarts the PostgreSQL service.
[^reset]: Deletes PostgreSQL users, database and its tables.\
  Sets the default parameters of the PostgreSQL server.\
  Restarts the PostgreSQL service.
[^multi_threaded]: Uses multiple threads for crawling sources which do not contain new addresses (mainly reports).
[^automated_run]: The program automatically checks the availability of new data.\
  Once the new data are available, it downloads and stores them in the database and on the disk.\
  The program never stops unless it is terminated by the user or the operating system.
[^robots_txt]: The Crawler respects robots.txt rules of each source.
[^altcoins]: The Crawler is able to find out the cryptocurrency of a given address from all of the blockchains available on [Blockchair](https://blockchair.com/ "Blockchair").
[^useful_data]: The Crawler saves only the data that contains useful information about certain BTC address.
[^connecting_addresses_and_data]: The Crawler connects the crawled addresses and data.

### Requirements:
- [PostgreSQL 15.1 for Windows (64-bit)](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads "PostgreSQL 15.1 for Windows (64-bit)")
- [Python 3.11 for Windows (64-bit)](https://www.python.org/downloads/windows/ "Python 3.11 for Windows (64-bit)")

### Installation:
1. Download and install PostgreSQL (during the installation set the password: postgres)
2. Download and install Python (during the installation check the option: Add python.exe to PATH)
3. Go to Settings / Apps / Advanced app settings / App execution aliases and turn off python.exe
4. Restart computer
5. Go to the program directory `db_builder`
6. Rename the file `example_db.json` to `db.json`
7. Change password of connection in `db.json`
8. Rename the file `example_setup.json` to `setup.json`
9. Change passwords of users in `setup.json`
10. Open a command prompt
11. Change the current working directory to `db_builder`
12. Install packages using the command `pip install -U -r requirements.txt`

### Running:
1. Open a command prompt (as administrator)[^as_admin]
2. Change the current working directory to `db_builder`
3. Run the program using the command `python main.py`
4. If User Account Control appears, press `Yes`[^why_as_admin]

[^as_admin]: If you do not open the command line as administrator, you would be prompted by the User Account Control (UAC).
[^why_as_admin]: Running the program as administrator is required because the program runs another commands (installing packages, restarting PostgreSQL, etc.) which need administrator access.

## :earth_americas: Web Client [[client](client "Web Client")]
### Features:
- :hammer: REST API
  - :heavy_check_mark: Get token
  - :heavy_check_mark: Get list of addresses
  - :heavy_check_mark: Get single address
  - :heavy_check_mark: Get data
  - :heavy_check_mark: Get list of sources
  - :heavy_check_mark: Get single source
  - :heavy_check_mark: Get source label
  - :heavy_check_mark: Limit access by user roles
  - :x: Generate token (linked with the account or IP address)
  - :x: Caching data
- :hammer: Web pages
  - :hammer: Index - search bar, list of sources, statistics
  - :x: Sign up
  - :x: Sign in
  - :x: Forgotten password
  - :x: Search by address
  - :x: Source - list of source labels
  - :x: Source / source label - list of addresses
  - :x: Data - list of addresses (independent on source label)
  - :x: API docs
  - :x: FAQ

### Requirements:
- [Node.js 18.13.0 LTS for Windows (64-bit)](https://nodejs.org/en/download/ "Node.js 18.13.0 LTS for Windows (64-bit)")

### Installation:
1. Download and install Node.js
2. Restart computer
3. Go to the program directory `client`
4. Rename the file `example_db.json` to `db.json`
5. Change password of connection in `db.json`
6. Open a command prompt
7. Change the current working directory to `client`
8. Install packages using the command `npm i -g npm-check-updates && ncu -u && npm i`

### Running:
1. Open a command prompt
2. Change the current working directory to `client`
3. Run the program using the command `node main.js`

## :printer: Documentation [[documentation](documentation "Documentation")]
### Content:
- :memo: [Database dump](documentation/db_dump.sql "Database dump")
- :memo: [Database schema plan](documentation/db_schema_plan.png "Database schema plan")
- :memo: [ER diagram](documentation/er_diagram.png "ER diagram")

## :ice_cube: Crawler (Node.js) [[deprecated](deprecated "Crawler (Node.js)")]
*Crawler (Node.js) is now deprecated and has been replaced by the newer [Database Builder](#hammer_and_wrench-database-builder-db_builder "Database Builder")!*
### Features:
- :heavy_check_mark: CRUD operations with the MySQL database
- :heavy_check_mark: Multi-threaded downloading and processing
- :heavy_check_mark: Crawling tree limitation - max level (depth), max serial number (count), max delay (crawling frequency)
- :heavy_check_mark: Parsing the data collected by the Crawler