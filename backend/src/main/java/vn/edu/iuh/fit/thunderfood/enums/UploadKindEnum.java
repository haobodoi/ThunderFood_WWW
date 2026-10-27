package vn.edu.iuh.fit.thunderfood.enums;

public enum UploadKindEnum {
    AVATAR(false),
    COVER(false),
    ID_FRONT(true),
    ID_BACK(true),
    BUSINESS_LICENSE(true);

    private final boolean privateFile;

    UploadKindEnum(boolean privateFile) {
        this.privateFile = privateFile;
    }

    public boolean isPrivateFile() {
        return privateFile;
    }
}
