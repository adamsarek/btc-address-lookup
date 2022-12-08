<br/>

# BTC Address Lookup (Master Thesis)
The goal of the thesis is creation of a tool for pinpointing owners of the Bitcoin addresses found on the internet. The data are collected in a PostgreSQL database by continuously crawling provided URLs and obtained directly from the source code. The scripts are built in Python and running on a remote server.
<br/>
<br/>

## :hammer_and_wrench: Database Builder [[db-builder](../../tree/main/db-builder "Database Builder")]
### Features:
- :heavy_check_mark: The PostgreSQL database initializer
  - :heavy_check_mark: Setup
  - :heavy_check_mark: Reset
- :heavy_check_mark: CRUD operations with the PostgreSQL database
- :heavy_check_mark: Multi-threaded downloading and processing
- :x: Complete database schema
- :hammer: Crawling all BTC addresses / reports from the following sources:
  - :heavy_check_mark: [LoyceV](http://alladdresses.loyce.club "LoyceV")
    - :heavy_check_mark: Weekly updates with full address history (GZIP)
    - :heavy_check_mark: Daily updates (TXT)
  - :x: [BitcoinAbuse](https://www.bitcoinabuse.com/reports "BitcoinAbuse")
  - :x: [CheckBitcoinAddress](https://checkbitcoinaddress.com/abuse-reports-to-bitcoin-address "CheckBitcoinAddress")
  - :x: [CryptoBlacklist](https://www.cryptoblacklist.io "CryptoBlacklist")
  - :hammer: [Bitcoin Generator Scam](http://ssrg.site.uottawa.ca/bgsieeesb2020/#urls "Bitcoin Generator Scam")
    - :heavy_check_mark: Scam BTC addresses
    - :hammer: Scam non-BTC addresses (address currency not yet specified)
  - :x: [BitcoinAIS](https://bitcoinais.com "BitcoinAIS")
  - :x: [CryptoScamDB](https://cryptoscamdb.org "CryptoScamDB")
  - :x: [Cryptscam](https://cryptscam.com "Cryptscam")
  - :x: [SeeKoin](https://www.seekoin.com/address.php "SeeKoin")
- :x: Parsing the data collected by the Crawler
- :x: Exception handling
- :x: Automated crawling and parsing
<br/>

## :earth_americas: Web Client [[client](../../tree/main/client "Web Client")]
### Features:
- :x: Searching of BTC address
- :x: Searching of BTC address reports
- :x: Searching of BTC address owners
- :x: Account system
  - :x: Sign up / Sign in
  - :x: Roles
<br/>

## :printer: Documentation [[documentation](../../tree/main/documentation "Documentation")]
### Content:
- :memo: [Database dump](../../tree/main/documentation/db-dump.sql "Database dump")
- :memo: [Database schema plan](../../tree/main/documentation/db-schema-plan.png "Database schema plan")
- :memo: [ER diagram](../../tree/main/documentation/er-diagram.png "ER diagram")
<br/>

## :ice_cube: Crawler (Node.js) [[deprecated](../../tree/main/deprecated "Crawler (Node.js)")]
### **Crawler (Node.js) is now deprecated and was replaced by the newer [Database Builder](README.md#database-builder-db-builder "Database Builder")!**
### Features:
- :heavy_check_mark: CRUD operations with the MySQL database
- :heavy_check_mark: Multi-threaded downloading and processing
- :heavy_check_mark: Crawling tree limitation - max level (depth), max serial number (count), max delay (crawling frequency)
- :heavy_check_mark: Parsing the data collected by the Crawler
<br/>