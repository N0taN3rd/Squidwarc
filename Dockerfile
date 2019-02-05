FROM node:11-stretch

LABEL maintainer="John Berlin <n0tan3rd@gmail.com>"

# See https://crbug.com/795759
RUN apt-get update && apt-get -yq upgrade && apt-get install \
    && apt-get install -yq build-essential && apt-get autoremove && apt-get autoclean

RUN apt-get install -y git-core libasound2 libatk1.0-0 libatomic1 libavcodec57 \
     libavformat57 libavformat57 libavutil55 libavutil55 libc6 libcairo2\
     libcups2 libdbus-1-3 libdrm2 libevent-2.0-5 libexpat1 libflac8 libfontconfig1 libfreetype6 libgcc1 libgcc1\
     libgdk-pixbuf2.0-0 libglib2.0-0 libgtk2.0-0 libicu57 libjpeg62-turbo libminizip1 libnspr4 libnss3 libopenjp2-7\
     libopus0 libpango-1.0-0 libpangocairo-1.0-0 libpangoft2-1.0-0 libpci3 libpng16-16 libpulse0 libre2-3 libsnappy1v5\
     libstdc++6 libvpx4 libwebp6 libwebpdemux2 libwebpmux2 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1\
     libxdamage1 libxext6 libxfixes3 libxi6 libxml2 libxrandr2 libxrender1 libxslt1.1 libxss1 libxtst6 x11-utils\
     xdg-utils zlib1g fonts-liberation libgl1-mesa-dri wget gconf-service lsb-release libgtk-3-0 libappindicator1 \
     libgconf-2-4 gconf2-common libdbusmenu-glib4 libdbusmenu-gtk4 libindicator7


RUN apt-get update && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst ttf-freefont \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

# It's a good idea to use dumb-init to help prevent zombie chrome processes.
ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_amd64 /usr/local/bin/dumb-init
RUN chmod +x /usr/local/bin/dumb-init

# Add user so we don't need --no-sandbox.
RUN groupadd -r squidwarcUser && useradd -r -g squidwarcUser -G audio,video squidwarcUser \
    && mkdir -p /home/squidwarcUser/Downloads \
    && chown -R squidwarcUser:squidwarcUser /home/squidwarcUser

# Run everything after as non-privileged user.
USER squidwarcUser

ARG CACHEBUST=1
ENV INDOCKER=1

COPY . /Squidwarc/

WORKDIR /Squidwarc

RUN ./bootstrap.sh

RUN mkdir warcs
VOLUME /Squidwarc/warcs

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js", "-c", "warcs/conf.json"]
