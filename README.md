# :mag: BTC Address Lookup (Master Thesis)
The goal of the thesis is creation of a tool for pinpointing owners of the Bitcoin addresses found on the internet. The data are collected in a PostgreSQL database by continuously crawling provided URLs and obtained directly from the source code. The scripts are built in Python and running on a remote server.

## :hammer_and_wrench: Database Builder [[db_builder](db_builder "Database Builder")]
### Features:
- :heavy_check_mark: The PostgreSQL database initializer
  - :heavy_check_mark: Setup[^setup]
  - :heavy_check_mark: Reset[^reset]
- :heavy_check_mark: CRUD operations with the PostgreSQL database
- :heavy_check_mark: Multi-threaded downloading and processing[^multi_threaded]
- :heavy_check_mark: Automated run[^automated_run]
- :heavy_check_mark: Fulfilling the robots.txt rules[^robots_txt]
- :x: Complete database schema
- :hammer: Crawling all addresses / reports from the following sources[^robots_txt]:
  - :heavy_check_mark: [LoyceV](http://alladdresses.loyce.club "LoyceV")
    - :heavy_check_mark: Weekly updates with all BTC addresses (GZIP)
    - :heavy_check_mark: Daily updates (TXT)
  - :x: [BitcoinAbuse](https://www.bitcoinabuse.com/reports "BitcoinAbuse")
    - :x: Reported BTC addresses (HTML)
  - :x: [CheckBitcoinAddress](https://checkbitcoinaddress.com/abuse-reports-to-bitcoin-address "CheckBitcoinAddress")
    - :x: Reported BTC addresses (HTML)
  - :heavy_check_mark: [CryptoBlacklist](https://www.cryptoblacklist.io "CryptoBlacklist")
    - :heavy_check_mark: Searched reported BTC addresses (HTML)
    - :heavy_check_mark: Last reported ETH addresses (HTML)
  - :heavy_check_mark: [Bitcoin Generator Scam](http://ssrg.site.uottawa.ca/bgsieeesb2020/#urls "Bitcoin Generator Scam")
    - :heavy_check_mark: Scam BTC addresses (TXT)
    - :heavy_check_mark: Scam non-BTC addresses (TXT)[^altcoins]
  - :x: [BitcoinAIS](https://bitcoinais.com "BitcoinAIS")
    - :x: Reported BTC addresses (HTML)
  - :heavy_check_mark: [CryptoScamDB](https://cryptoscamdb.org "CryptoScamDB")
    - :heavy_check_mark: Reported addresses (JSON)[^altcoins]
  - :heavy_check_mark: [Cryptscam](https://cryptscam.com "Cryptscam")
    - :heavy_check_mark: Searched reported BTC addresses (HTML)
    - :heavy_check_mark: Last reported addresses (HTML)[^altcoins]
  - :x: [SeeKoin](https://www.seekoin.com/address.php "SeeKoin")
    - :x: Reported BTC addresses (HTML)
- :x: Connecting the crawled addresses and data[^connecting_addresses_and_data]
- :x: Exception handling

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
[^altcoins]: The Crawler is able to find out the cryptocurrency of a given address from the 18 blockchains available on [Blockchair](https://blockchair.com/ "Blockchair").
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
- :x: Searching of BTC address
- :x: Searching of BTC address reports
- :x: Searching of BTC address owners
- :x: Account system
  - :x: Sign up / Sign in
  - :x: Roles

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