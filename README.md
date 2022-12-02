# BTC Address Lookup (Master Thesis)
The goal of the thesis is creation of a tool for pinpointing owners of the Bitcoin addresses found on the internet. The data are collected in a PostgreSQL database by continuously crawling provided URLs and obtained directly from the source code. The scripts are built in Python and running on a remote server.

## Database Builder [[db-builder](../../tree/main/db-builder "Database Builder")]
### Features:
- :heavy_check_mark: The PostgreSQL database initializer
  - :heavy_check_mark: Setup
  - :heavy_check_mark: Reset
- :heavy_check_mark: CRUD operations with the PostgreSQL database
- :x: Complete database schema
- :hammer: Crawling all BTC addresses / reports from the following sources:
  - :hammer: [LoyceV](http://alladdresses.loyce.club "LoyceV")
  - :x: [BitcoinAbuse](https://www.bitcoinabuse.com/reports "BitcoinAbuse")
  - :x: [CheckBitcoinAddress](https://checkbitcoinaddress.com/abuse-reports-to-bitcoin-address "CheckBitcoinAddress")
  - :x: [CryptoBlacklist](https://www.cryptoblacklist.io "CryptoBlacklist")
  - :x: [Bitcoin Generator Scam](http://ssrg.site.uottawa.ca/bgsieeesb2020/#urls "Bitcoin Generator Scam")
  - :x: [BitcoinAIS](https://bitcoinais.com "BitcoinAIS")
  - :x: [CryptoScamDB](https://cryptoscamdb.org "CryptoScamDB")
  - :x: [Cryptscam](https://cryptscam.com "Cryptscam")
  - :x: [SeeKoin](https://www.seekoin.com/address.php "SeeKoin")
- :x: Parsing the data collected by the Crawler


## Web Client [[client](../../tree/main/client "Web Client")]
### Features:
- :x: Searching of BTC address
- :x: Searching of BTC address reports
- :x: Searching of BTC address owners
- :x: Account system
  - :x: Sign up / Sign in
  - :x: Roles
