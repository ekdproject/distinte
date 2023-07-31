FROM node
WORKDIR /app
ENV PORT=5003
COPY . .
RUN npm install
RUN ls
EXPOSE ${PORT}
CMD ["node","index.js"]
