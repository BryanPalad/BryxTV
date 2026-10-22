# TMDB integration references

- Authentication: https://developer.themoviedb.org/docs/authentication-application
- Image URL conventions: https://developer.themoviedb.org/docs/image-basics
- Movie discovery and OR company filters: https://developer.themoviedb.org/reference/discover-movie
- TV discovery: https://developer.themoviedb.org/reference/discover-tv
- Attribution requirements: https://developer.themoviedb.org/docs/faq
- Approved logo source: https://www.themoviedb.org/about/logos-attribution

Company identifiers were confirmed against authenticated `/3/company/2`, `/3/company/3`, and `/3/company/6125` responses during implementation. Their names are Walt Disney Pictures, Pixar, and Walt Disney Animation Studios respectively. No watch-provider identifier or Disney+ availability assumption is used.

The official short logo is stored unmodified in `public/tmdb-logo.svg`. Artwork and metadata are provided by TMDB and retain their respective rights holders’ ownership.
