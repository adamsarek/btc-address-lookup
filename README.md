# :mag: BTC Address Lookup (Master Thesis)
The goal of the thesis is creation of a tool for pinpointing owners of the Bitcoin addresses found on the internet. The data are collected in a PostgreSQL database by continuously crawling provided URLs and obtained directly from the source code. The scripts are built in Python and running on a remote server.

## :hammer_and_wrench: Database Builder [[db-builder](db-builder "Database Builder")]
### Features:
- :heavy_check_mark: The PostgreSQL database initializer
  - :heavy_check_mark: Setup[^setup]
  - :heavy_check_mark: Reset[^reset]
- :heavy_check_mark: CRUD operations with the PostgreSQL database
- :heavy_check_mark: Multi-threaded downloading and processing[^multi-threaded]
- :heavy_check_mark: Automated run[^automated-run]
- :x: Complete database schema
- :x: Fulfilling the robots.txt rules[^robots-txt]
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
    - :hammer: Last reported addresses (HTML) *- address currency not yet specified*
  - :x: [SeeKoin](https://www.seekoin.com/address.php "SeeKoin")
    - :x: Reported BTC addresses (HTML)
- :x: Parsing the data collected by the Crawler[^connecting-addresses-and-data]
- :x: Exception handling

[^setup]: Creates PostgreSQL users, database and its tables.\
  Fills the tables with the initial data.\
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

### Requirements:
- [PostgreSQL 15.1 for Windows (64-bit)](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads "PostgreSQL 15.1 for Windows (64-bit)")
- [Python 3.11 for Windows (64-bit)](https://www.python.org/downloads/windows/ "Python 3.11 for Windows (64-bit)")

### Installation:
1. Download and install PostgreSQL (during the installation set the password: postgres)
2. Download and install Python (during the installation check the option: Add python.exe to PATH)
3. Go to Settings / Apps / Advanced app settings / App execution aliases and turn off python.exe
4. Restart computer
5. Go to the program directory `db-builder`
6. Rename the file `example-db.json` to `db.json`
7. Change password of connection in `db.json`
8. Rename the file `example-setup.json` to `setup.json`
9. Change passwords of users in `setup.json`
10. Open a command prompt
11. Change the current working directory to `db-builder`
12. Install packages using the command `pip install -U -r requirements.txt`

### Running:
1. Open a command prompt (as administrator)[^as-admin]
2. Change the current working directory to `db-builder`
3. Run the program using the command `python main.py`
4. If User Account Control appears, press `Yes`[^why-as-admin]

[^as-admin]: If you do not open the command line as administrator, you would be prompted by the User Account Control (UAC).
[^why-as-admin]: Running the program as administrator is required because the program runs another commands (installing packages, restarting PostgreSQL, etc.) which need administrator access.

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