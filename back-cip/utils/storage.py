def select_raw_storage():
    from django.conf import settings
    if getattr(settings, 'CLOUDINARY_STORAGE', None):
        from cloudinary_storage.storage import RawMediaCloudinaryStorage
        return RawMediaCloudinaryStorage()
    from django.core.files.storage import FileSystemStorage
    return FileSystemStorage()
