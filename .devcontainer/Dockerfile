FROM ubuntu:latest

ENV BUN_INSTALL=/bun
RUN mkdir -p ${BUN_INSTALL} \
    && curl -k -fsSL https://bun.sh/install | bash 

ENV PATH=${BUN_INSTALL}/bin:${PATH}

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#    && apt-get -y install --no-install-recommends <your-package-list-here>