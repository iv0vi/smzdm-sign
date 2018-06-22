FROM node

COPY ./ /smzdm
CMD ["node", "/smzdm/smzdm.js"]