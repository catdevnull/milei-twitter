## import accounts

```
cat > x.txt
poetry run twscrape --db /db/accounts.db add_accounts x.txt username:password:email:email_password:_:mfa_code
# o
poetry run twscrape --db /db/accounts.db add_accounts /dev/stdin username:password:email:email_password:_:mfa_code
```

```
poetry run twscrape --db /db/accounts.db add_accounts /dev/stdin proxy,username,password,email,email_password,_,mfa_code
```
